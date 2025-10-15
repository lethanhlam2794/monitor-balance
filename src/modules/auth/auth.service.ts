// Import required libraries
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

// Import User model and interfaces
import { UserModel, UserDocument } from './auth.model';
import { UserRole } from './enums/user-role.enum';

/**
 * Service handling authentication and authorization
 * Manage user roles and permissions
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(UserModel.name) private userModel: Model<UserDocument>,
  ) {}


  async findByTelegramId(telegramId: number): Promise<UserModel | null> {
    try {
      return await this.userModel.findOne({ telegramId }).exec();
    } catch (error) {
      this.logger.error(`Error finding user by telegram ID ${telegramId}:`, error);
      return null;
    }
  }


  async createOrUpdateUser(userData: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  }): Promise<UserModel> {
    try {
      const existingUser = await this.findByTelegramId(userData.telegramId);
      
      if (existingUser) {
        // Update user information if already exists
        existingUser.username = userData.username || existingUser.username;
        existingUser.firstName = userData.firstName || existingUser.firstName;
        existingUser.lastName = userData.lastName || existingUser.lastName;
        existingUser.languageCode = userData.languageCode || existingUser.languageCode;
        existingUser.lastActiveAt = new Date();
        
        return await (existingUser as UserDocument).save();
      } else {
        // Create new user with default role USER
        const newUser = new this.userModel({
          ...userData,
          role: UserRole.USER,
          isActive: true,
          createdAt: new Date(),
          lastActiveAt: new Date(),
        });
        
        return await newUser.save();
      }
    } catch (error) {
      this.logger.error('Error creating/updating user:', error);
      throw error;
    }
  }


  async hasPermission(telegramId: number, requiredRole: UserRole): Promise<boolean> {
    try {
      const user = await this.findByTelegramId(telegramId);
      if (!user || !user.isActive) {
        return false;
      }

      // Check role hierarchy
      return this.checkRoleHierarchy(user.role, requiredRole);
    } catch (error) {
      this.logger.error(`Error checking permission for user ${telegramId}:`, error);
      return false;
    }
  }

  /**
   * Check role hierarchy
   * DEV > ADMIN > ADVANCED_USER > USER
   * @param userRole - User role
   * @param requiredRole - Required role
   * @returns true if user role >= required role
   */
  private checkRoleHierarchy(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.DEV]: 4,
      [UserRole.ADMIN]: 3,
      [UserRole.ADVANCED_USER]: 2,
      [UserRole.USER]: 1,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Update user role (only DEV and ADMIN have permission)
   * @param adminTelegramId - ID of admin performing
   * @param targetTelegramId - ID of user to update
   * @param newRole - New role
   * @returns true if successful, false if no permission
   */
  async updateUserRole(
    adminTelegramId: number,
    targetTelegramId: number,
    newRole: UserRole,
  ): Promise<boolean> {
    try {
      // Check admin permissions
      const hasPermission = await this.hasPermission(adminTelegramId, UserRole.ADMIN);
      if (!hasPermission) {
        this.logger.warn(`User ${adminTelegramId} attempted to update role without permission`);
        return false;
      }

      // Update role
      const result = await this.userModel.updateOne(
        { telegramId: targetTelegramId },
        { role: newRole, updatedAt: new Date() },
      ).exec();

      if (result.modifiedCount > 0) {
        this.logger.log(`User ${targetTelegramId} role updated to ${newRole} by ${adminTelegramId}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error updating user role:', error);
      return false;
    }
  }

  /**
   * Get users list by role
   * @param role - Role to filter
   * @returns Users list
   */
  async getUsersByRole(role: UserRole): Promise<UserModel[]> {
    try {
      return await this.userModel.find({ role, isActive: true }).exec();
    } catch (error) {
      this.logger.error(`Error getting users by role ${role}:`, error);
      return [];
    }
  }

  /**
   * Get user statistics
   * @returns Object containing statistics
   */
  async getUserStats(): Promise<{
    total: number;
    byRole: Record<UserRole, number>;
    activeToday: number;
  }> {
    try {
      const total = await this.userModel.countDocuments({ isActive: true });
      
      const byRole = {
        [UserRole.DEV]: await this.userModel.countDocuments({ role: UserRole.DEV, isActive: true }),
        [UserRole.ADMIN]: await this.userModel.countDocuments({ role: UserRole.ADMIN, isActive: true }),
        [UserRole.ADVANCED_USER]: await this.userModel.countDocuments({ role: UserRole.ADVANCED_USER, isActive: true }),
        [UserRole.USER]: await this.userModel.countDocuments({ role: UserRole.USER, isActive: true }),
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const activeToday = await this.userModel.countDocuments({
        isActive: true,
        lastActiveAt: { $gte: today },
      });

      return { total, byRole, activeToday };
    } catch (error) {
      this.logger.error('Error getting user stats:', error);
      return { total: 0, byRole: {} as Record<UserRole, number>, activeToday: 0 };
    }
  }
}
