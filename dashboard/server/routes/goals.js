/**
 * Routes: Goals
 */
import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '../data/goals.json');

const router = Router();

function load() {
  return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
}

function save(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET /goals
router.get('/', (req, res) => {
  const data = load();
  res.json({ success: true, goals: data.goals });
});

// GET /goals/:id
router.get('/:id', (req, res) => {
  const data = load();
  const goal = data.goals.find(g => g.id === req.params.id);
  if (!goal) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, goal });
});

// POST /goals
router.post('/', (req, res) => {
  const { title, target, unit, deadline } = req.body;
  if (!title || !target) return res.status(400).json({ success: false, error: 'Title and target required' });
  
  const data = load();
  const goal = {
    id: `goal_${Date.now()}`,
    title,
    target,
    current: 0,
    unit: unit || '',
    deadline: deadline || null,
    status: 'in_progress',
    createdAt: new Date().toISOString()
  };
  data.goals.push(goal);
  save(data);
  res.json({ success: true, goal });
});

// PUT /goals/:id
router.put('/:id', (req, res) => {
  const data = load();
  const idx = data.goals.findIndex(g => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });
  
  const goal = { ...data.goals[idx], ...req.body, id: req.params.id };
  
  // Auto-update status
  if (goal.current >= goal.target) {
    goal.status = 'completed';
  } else if (goal.current > 0) {
    goal.status = 'in_progress';
  }
  
  data.goals[idx] = goal;
  save(data);
  res.json({ success: true, goal });
});

// DELETE /goals/:id
router.delete('/:id', (req, res) => {
  const data = load();
  data.goals = data.goals.filter(g => g.id !== req.params.id);
  save(data);
  res.json({ success: true });
});

export default router;
