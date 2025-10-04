import { Request, Response, NextFunction } from 'express';
import { getCanonicalUserId } from '../helpers/canonicalUser';
import { appLogger } from '../appLogger';

export interface AuthenticatedRequest extends Request {
  user?: {
    claims: any;
    id?: string;
  };
}

export async function attachCanonicalUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user?.claims) {
      return next();
    }

    req.user.id = await getCanonicalUserId(req.user.claims);
    next();
  } catch (error: any) {
    await appLogger.log({
      action: "Canonical user middleware error",
      error: error.message,
      fix: "Returning 500 error to client"
    });
    
    console.error('[CanonicalUser] Middleware error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
