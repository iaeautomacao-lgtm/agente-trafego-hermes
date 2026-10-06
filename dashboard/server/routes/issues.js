/**
 * Routes: Issues
 */
import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '../data/issues.json');

const router = Router();

function load() {
  return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
}

function save(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET /issues
router.get('/', (req, res) => {
  const data = load();
  let issues = data.issues;
  
  // Filters
  if (req.query.status) issues = issues.filter(i => i.status === req.query.status);
  if (req.query.priority) issues = issues.filter(i => i.priority === req.query.priority);
  if (req.query.assignedTo) issues = issues.filter(i => i.assignedTo === req.query.assignedTo);
  if (req.query.projectId) issues = issues.filter(i => i.projectId === req.query.projectId);
  
  res.json({ success: true, issues });
});

// GET /issues/:id
router.get('/:id', (req, res) => {
  const data = load();
  const issue = data.issues.find(i => i.id === req.params.id);
  if (!issue) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, issue });
});

// POST /issues
router.post('/', (req, res) => {
  const { title, description, priority = 'medium', assignedTo, projectId } = req.body;
  if (!title) return res.status(400).json({ success: false, error: 'Title required' });
  
  const data = load();
  const count = data.issues.length + 1;
  const issue = {
    id: `ISS-${String(count).padStart(3, '0')}`,
    title,
    description: description || '',
    status: 'open',
    priority,
    assignedTo: assignedTo || null,
    projectId: projectId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.issues.push(issue);
  save(data);
  res.json({ success: true, issue });
});

// PUT /issues/:id
router.put('/:id', (req, res) => {
  const data = load();
  const idx = data.issues.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });
  
  data.issues[idx] = {
    ...data.issues[idx],
    ...req.body,
    id: req.params.id,
    updatedAt: new Date().toISOString()
  };
  save(data);
  res.json({ success: true, issue: data.issues[idx] });
});

// DELETE /issues/:id
router.delete('/:id', (req, res) => {
  const data = load();
  data.issues = data.issues.filter(i => i.id !== req.params.id);
  save(data);
  res.json({ success: true });
});

export default router;
