import { storage } from '../storage';
import { appLogger } from '../appLogger';

export async function getCanonicalUserId(authClaims: any): Promise<string> {
  const startTime = Date.now();
  
  try {
    const authId = authClaims.sub;
    
    const dbUser = await storage.upsertUser({
      id: authId,
      email: authClaims.email || null,
      firstName: authClaims.first_name || null,
      lastName: authClaims.last_name || null,
      profileImageUrl: authClaims.profile_image_url || null,
    });

    const duration = Date.now() - startTime;
    
    if (dbUser.id !== authId) {
      await appLogger.log({
        action: "Canonical user ID resolved (ID mismatch detected)",
        metadata: {
          authId,
          canonicalId: dbUser.id,
          email: authClaims.email,
          duration: `${duration}ms`
        },
        insights: "User's auth ID differs from database ID - canonical resolution prevents foreign key violations"
      });
    }
    
    return dbUser.id;
  } catch (error: any) {
    await appLogger.log({
      action: "Canonical user ID resolution failed",
      error: error.message,
      metadata: {
        authId: authClaims.sub,
        email: authClaims.email
      }
    });
    throw error;
  }
}
