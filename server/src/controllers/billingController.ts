import { Request, Response } from 'express';
import { runAutomatedBilling } from '../services/billingService';

export async function triggerBillingRun(req: Request, res: Response): Promise<void> {
  try {
    const result = await runAutomatedBilling();
    res.json({
      message: 'Automated billing cycle completed successfully.',
      ...result
    });
  } catch (error: any) {
    console.error('Billing cycle error:', error);
    res.status(500).json({ message: 'Error executing automated billing', error: error.message });
  }
}
