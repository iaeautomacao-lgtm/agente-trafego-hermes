/**
 * Routes: Logs
 */
import { Router } from 'express';
import { getLogs, clearLogs } from '../logger.js';

const router = Router();

// GET /logs
router.get('/', (req, res) => {
  const { agentId, level, limit, offset } = req.query;
  const logs = getLogs({
    agentId,
    level,
    limit: parseInt(limit) || 100,
    offset: parseInt(offset) || 0
  });
  res.json({ success: true, logs });
});

// GET /logs/:agentId
router.get('/:agentId', (req, res) => {
  const logs = getLogs({
    agentId: req.params.agentId,
    limit: parseInt(req.query.limit) || 100
  });
  res.json({ success: true, logs });
});

// DELETE /logs
router.delete('/', (req, res) => {
  clearLogs();
  res.json({ success: true });
});

// DELETE /logs/:agentId
router.delete('/:agentId', (req, res) => {
  clearLogs(req.params.agentId);
  res.json({ success: true });
});

export default router;
