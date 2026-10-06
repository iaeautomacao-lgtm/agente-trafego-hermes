/**
 * Routes: Projects
 */
import { Router } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '../data/projects.json');

const router = Router();

function load() {
  return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
}

function save(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET /projects
router.get('/', (req, res) => {
  const data = load();
  res.json({ success: true, projects: data.projects });
});

// GET /projects/:id
router.get('/:id', (req, res) => {
  const data = load();
  const project = data.projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, project });
});

// POST /projects
router.post('/', (req, res) => {
  const { name, description, agents = [] } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  
  const data = load();
  const project = {
    id: `proj_${Date.now()}`,
    name,
    description: description || '',
    status: 'active',
    agents,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.projects.push(project);
  save(data);
  res.json({ success: true, project });
});

// PUT /projects/:id
router.put('/:id', (req, res) => {
  const data = load();
  const idx = data.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Not found' });
  
  data.projects[idx] = {
    ...data.projects[idx],
    ...req.body,
    id: req.params.id,
    updatedAt: new Date().toISOString()
  };
  save(data);
  res.json({ success: true, project: data.projects[idx] });
});

// DELETE /projects/:id
router.delete('/:id', (req, res) => {
  const data = load();
  data.projects = data.projects.filter(p => p.id !== req.params.id);
  save(data);
  res.json({ success: true });
});

export default router;
