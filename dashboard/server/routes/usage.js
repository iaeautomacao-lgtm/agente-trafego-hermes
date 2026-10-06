/**
 * Routes: Usage/Tokens
 */
import { Router } from 'express';
import { getUsage, getUsageByAgent, getUsageLast7Days } from '../token-tracker.js';

const router = Router();

// GET /usage
router.get('/', (req, res) => {
  const usage = getUsage();
  res.json({ success: true, usage });
});

// GET /usage/chart
router.get('/chart', (req, res) => {
  const days = getUsageLast7Days();
  res.json({ success: true, days });
});

// GET /usage/:agentId
router.get('/:agentId', (req, res) => {
  const usage = getUsageByAgent(req.params.agentId);
  res.json({ success: true, usage });
});

export default router;
