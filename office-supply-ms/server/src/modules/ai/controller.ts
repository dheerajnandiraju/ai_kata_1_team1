import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { generateRequestAssist } from './service';

export const requestAssistValidation = [
  body('mode').optional().isIn(['request-remarks', 'rejection-reason']),
  body('itemName').trim().notEmpty().withMessage('Item name is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('remarks').optional().isString(),
];

export async function requestAssist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { mode, itemName, quantity, remarks } = req.body;
    const suggestion = await generateRequestAssist({ mode, itemName, quantity, remarks });

    res.json({ suggestion });
  } catch (err) {
    next(err);
  }
}
