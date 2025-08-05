import type { Express } from 'express';
import { storage } from '../storage/mongoStorage';
import { authenticate } from '../utils/auth';
import { log } from '../utils/vite';

export function registerUserRoutes(app: Express) {
  app.get('/api/users', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      log(`[users] Get error: ${(error as Error).message}`);
      res.status(500).json({ message: 'Failed to get users', error: (error as Error).message });
    }
  });

  app.patch('/api/users/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    try {
      const userId = req.params.id; // Treat as string (UUID)
      const updates = req.body;

      // Prevent password updates through this endpoint
      delete updates.password;

      // Validate updates
      const allowedUpdates = ['name', 'email', 'role', 'department', 'isActive'];
      const isValidOperation = Object.keys(updates).every((update) => allowedUpdates.includes(update));
      if (!isValidOperation) {
        return res.status(400).json({ message: 'Invalid updates' });
      }

      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      log(`[users] Update error: ${(error as Error).message}`);
      res.status(500).json({ message: 'Failed to update user', error: (error as Error).message });
    }
  });

  app.delete('/api/users/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    try {
      const userId = req.params.id; // Treat as string (UUID)

      if (userId === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete own account' });
      }

      const deletedUser = await storage.deleteUser(userId);
      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.createAuditLog({
        userId: req.user.id,
        action: 'delete',
        entityType: 'user',
        entityId: userId,
        details: { deletedUserEmail: deletedUser.email },
      });

      res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      log(`[users] Delete error: ${(error as Error).message}`);
      res.status(500).json({ message: 'Failed to delete user', error: (error as Error).message });
    }
  });
}