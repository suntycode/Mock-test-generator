import mongoose from 'mongoose';
import { z } from 'zod';
import ExamProfile from '../models/ExamProfile.js';
import Blueprint from '../models/Blueprint.js';
import Question from '../models/Question.js';
import { loadTaxonomy } from './taxonomy.service.js';
import { AppError } from '../utils/errors.js';

const buildInputSchema = z.object({ examKey: z.string().min(1), paperIds: z.array(z.string()).optional() }).strict();
const blueprintPatchSchema = z.object({
  sections: z.array(z.object({ name: z.string(), total: z.number().int().nonnegative(), categories: z.array(z.object({ name: z.string(), count: z.number().int().nonnegative(), subcategories: z.array(z.object({ name: z.string(), count: z.number().int().nonnegative() })) })) })),
  difficultyMix: z.object({ easy: z.number().nonnegative(), medium: z.number().nonnegative(), hard: z.number().nonnegative() })
}).strict();

export function largestRemainder(weights, target) {
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  if (!weights.length) return [];
  const basis = total > 0 ? total : weights.length;
  const rows = weights.map((item, index) => {
    const exact = (total > 0 ? item.weight : 1) * target / basis;
    return { ...item, value: Math.floor(exact), remainder: exact - Math.floor(exact), index };
  });
  let remaining = target - rows.reduce((sum, row) => sum + row.value, 0);
  rows.slice().sort((a, b) => b.remainder - a.remainder || a.index - b.index).slice(0, remaining).forEach((row) => { rows[row.index].value += 1; });
  return rows.map(({ value, ...item }) => ({ ...item, count: value }));
}

export async function getAnalyticsSummary(examKey) {
  if (!examKey) throw new AppError('VALIDATION_ERROR', 'examKey is required.', 400);
  const groups = await Question.aggregate([
    { $match: { examKey, verified: true, origin: 'extracted' } },
    { $group: { _id: { section: '$section', category: '$category', subcategory: '$subcategory', difficulty: '$difficulty' }, count: { $sum: 1 } } },
    { $sort: { '_id.section': 1, '_id.category': 1, '_id.subcategory': 1 } }
  ]);
  return { examKey, total: groups.reduce((sum, group) => sum + group.count, 0), groups };
}

export async function buildBlueprint(input) {
  const { examKey, paperIds } = buildInputSchema.parse(input);
  const profile = await ExamProfile.findOne({ key: examKey }).lean();
  if (!profile) throw new AppError('EXAM_PROFILE_NOT_FOUND', `Unknown examKey: ${examKey}`, 404);
  const filter = { examKey, verified: true, origin: 'extracted' };
  if (paperIds) {
    if (paperIds.some((id) => !mongoose.isValidObjectId(id))) throw new AppError('VALIDATION_ERROR', 'paperIds must contain valid ids.', 400);
    filter.paperId = { $in: paperIds.map((id) => new mongoose.Types.ObjectId(id)) };
  }
  const paperList = paperIds?.length ? await Question.distinct('paperId', filter) : await Question.distinct('paperId', filter);
  if (!paperList.length) throw new AppError('NO_VERIFIED_QUESTIONS', 'Verify extracted questions before building a blueprint.', 409);
  const perPaper = await Question.aggregate([
    { $match: { ...filter, paperId: { $in: paperList } } },
    { $group: { _id: { paperId: '$paperId', section: '$section', category: '$category', subcategory: '$subcategory', difficulty: '$difficulty' }, count: { $sum: 1 } } }
  ]);
  const leafWeights = new Map();
  const difficultyTotals = { easy: 0, medium: 0, hard: 0 };
  for (const row of perPaper) {
    const key = `${row._id.section}\u0000${row._id.category || 'Other'}\u0000${row._id.subcategory || 'Other'}`;
    const entry = leafWeights.get(key) || { section: row._id.section, category: row._id.category || 'Other', subcategory: row._id.subcategory || 'Other', weight: 0 };
    entry.weight += row.count / paperList.length;
    leafWeights.set(key, entry);
    if (row._id.difficulty in difficultyTotals) difficultyTotals[row._id.difficulty] += row.count / paperList.length;
  }
  const sections = profile.sections.slice().sort((a, b) => a.order - b.order).map((profileSection) => {
    let leaves = [...leafWeights.values()].filter((leaf) => leaf.section === profileSection.name);
    if (!leaves.length) leaves = [{ section: profileSection.name, category: 'Other', subcategory: 'Other', weight: 1 }];
    const allocated = largestRemainder(leaves, profileSection.questions);
    const categories = new Map();
    for (const leaf of allocated) {
      const category = categories.get(leaf.category) || { name: leaf.category, count: 0, subcategories: [] };
      category.count += leaf.count;
      category.subcategories.push({ name: leaf.subcategory, count: leaf.count });
      categories.set(leaf.category, category);
    }
    return { name: profileSection.name, total: profileSection.questions, categories: [...categories.values()] };
  });
  const totalObserved = Object.values(difficultyTotals).reduce((a, b) => a + b, 0);
  const difficultyMix = totalObserved < 30 ? { easy: 0.3, medium: 0.5, hard: 0.2 } : Object.fromEntries(Object.entries(difficultyTotals).map(([key, value]) => [key, value / totalObserved]));
  return Blueprint.create({ examKey, basedOnPapers: paperList, sections, difficultyMix });
}

export async function createDefaultBlueprint(examKey) {
  const profile = await ExamProfile.findOne({ key: examKey }).lean();
  if (!profile) throw new AppError('EXAM_PROFILE_NOT_FOUND', `Unknown examKey: ${examKey}`, 404);
  const taxonomy = await loadTaxonomy();

  const sections = profile.sections.slice().sort((a, b) => a.order - b.order).map((profileSection) => {
    const sectionTaxonomy = taxonomy[profileSection.name] || {};
    const categoriesList = Object.entries(sectionTaxonomy);

    const leaves = [];
    for (const [catName, subcats] of categoriesList) {
      if (Array.isArray(subcats) && subcats.length > 0) {
        for (const subcatName of subcats) {
          leaves.push({ section: profileSection.name, category: catName, subcategory: subcatName, weight: 1 });
        }
      } else {
        leaves.push({ section: profileSection.name, category: catName, subcategory: 'General', weight: 1 });
      }
    }

    if (!leaves.length) {
      leaves.push({ section: profileSection.name, category: 'General', subcategory: 'General', weight: 1 });
    }

    const allocated = largestRemainder(leaves, profileSection.questions);
    const categories = new Map();
    for (const leaf of allocated) {
      const category = categories.get(leaf.category) || { name: leaf.category, count: 0, subcategories: [] };
      category.count += leaf.count;
      category.subcategories.push({ name: leaf.subcategory, count: leaf.count });
      categories.set(leaf.category, category);
    }
    return { name: profileSection.name, total: profileSection.questions, categories: [...categories.values()] };
  });

  const blueprint = await Blueprint.create({
    examKey,
    basedOnPapers: [],
    sections,
    difficultyMix: { easy: 0.3, medium: 0.5, hard: 0.2 }
  });

  return blueprint.toObject ? blueprint.toObject() : blueprint;
}

export async function getLatestBlueprint(examKey) {
  if (!examKey) throw new AppError('VALIDATION_ERROR', 'examKey is required.', 400);
  let blueprint = await Blueprint.findOne({ examKey }).sort({ createdAt: -1 }).lean();
  if (!blueprint) {
    blueprint = await createDefaultBlueprint(examKey);
  }
  return blueprint;
}

export async function updateBlueprint(id, input) {
  if (!mongoose.isValidObjectId(id)) throw new AppError('INVALID_BLUEPRINT_ID', 'Blueprint id is invalid.', 400);
  const parsed = blueprintPatchSchema.parse(input);
  const blueprint = await Blueprint.findById(id);
  if (!blueprint) throw new AppError('BLUEPRINT_NOT_FOUND', 'Blueprint was not found.', 404);
  const profile = await ExamProfile.findOne({ key: blueprint.examKey }).lean();
  if (!profile) throw new AppError('EXAM_PROFILE_NOT_FOUND', 'Exam profile was not found.', 404);
  const submitted = new Map(parsed.sections.map((section) => [section.name, section]));
  const sections = profile.sections.slice().sort((a, b) => a.order - b.order).map((profileSection) => {
    const section = submitted.get(profileSection.name);
    if (!section) throw new AppError('VALIDATION_ERROR', `Missing section ${profileSection.name}.`, 400);
    const flat = section.categories.flatMap((category) => category.subcategories.map((subcategory) => ({ category: category.name, subcategory: subcategory.name, weight: subcategory.count })));
    const allocated = largestRemainder(flat, profileSection.questions);
    const categories = new Map();
    for (const leaf of allocated) {
      const category = categories.get(leaf.category) || { name: leaf.category, count: 0, subcategories: [] };
      category.count += leaf.count;
      category.subcategories.push({ name: leaf.subcategory, count: leaf.count });
      categories.set(leaf.category, category);
    }
    return { name: profileSection.name, total: profileSection.questions, categories: [...categories.values()] };
  });
  const mixTotal = Object.values(parsed.difficultyMix).reduce((a, b) => a + b, 0);
  if (mixTotal <= 0) throw new AppError('VALIDATION_ERROR', 'difficultyMix must have a positive total.', 400);
  blueprint.sections = sections;
  blueprint.difficultyMix = Object.fromEntries(Object.entries(parsed.difficultyMix).map(([key, value]) => [key, value / mixTotal]));
  await blueprint.save();
  return blueprint;
}
