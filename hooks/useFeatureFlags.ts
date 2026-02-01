import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export interface FeatureFlag {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  updated_at: string;
}

export interface UserFeature {
  id: string;
  feature_key: string;
  value: any;
  expires_at: string | null;
  created_at: string;
}

export const useFeatureFlags = () => {
  const { user } = useAuth();
  const [flags, setFlags] = useState<Record<string, any>>({});
  const [userFeatures, setUserFeatures] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Fetch all global feature flags
  const fetchFlags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*');

      if (error) {
        console.error('Error fetching feature flags:', error);
        return;
      }

      const flagsMap: Record<string, any> = {};
      data?.forEach((flag: FeatureFlag) => {
        flagsMap[flag.key] = flag.value;
      });

      setFlags(flagsMap);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  // Fetch user-specific features
  const fetchUserFeatures = useCallback(async () => {
    if (!user) {
      setUserFeatures({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_features')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user features:', error);
        return;
      }

      const featuresMap: Record<string, any> = {};
      data?.forEach((feature: UserFeature) => {
        featuresMap[feature.feature_key] = feature.value;
      });

      setUserFeatures(featuresMap);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [user]);

  // Check if feature is enabled
  const isEnabled = useCallback((key: string): boolean => {
    // First check user-specific override
    if (userFeatures[key] !== undefined) {
      return userFeatures[key] === true || userFeatures[key] === 'true';
    }
    // Then check global flag
    if (flags[key] !== undefined) {
      return flags[key] === true || flags[key] === 'true';
    }
    return false;
  }, [flags, userFeatures]);

  // Get feature value
  const getValue = useCallback((key: string, defaultValue: any = null): any => {
    if (userFeatures[key] !== undefined) {
      return userFeatures[key];
    }
    if (flags[key] !== undefined) {
      return flags[key];
    }
    return defaultValue;
  }, [flags, userFeatures]);

  // Admin: Update feature flag
  const updateFlag = useCallback(async (key: string, value: any): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('update_feature_flag', {
        p_key: key,
        p_value: value,
      });

      if (error) {
        console.error('Error updating flag:', error);
        return false;
      }

      await fetchFlags();
      return true;
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  }, [fetchFlags]);

  // Admin: Grant feature to user
  const grantUserFeature = useCallback(async (
    userId: string, 
    featureKey: string, 
    value: any = true,
    expiresAt?: Date
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('grant_user_feature', {
        p_user_id: userId,
        p_feature_key: featureKey,
        p_value: value,
        p_expires_at: expiresAt?.toISOString(),
      });

      if (error) {
        console.error('Error granting feature:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  }, []);

  // Admin: Revoke feature from user
  const revokeUserFeature = useCallback(async (
    userId: string, 
    featureKey: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('revoke_user_feature', {
        p_user_id: userId,
        p_feature_key: featureKey,
      });

      if (error) {
        console.error('Error revoking feature:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  }, []);

  // Load flags on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchFlags();
      await fetchUserFeatures();
      setLoading(false);
    };

    load();
  }, [fetchFlags, fetchUserFeatures]);

  return {
    flags,
    userFeatures,
    loading,
    isEnabled,
    getValue,
    updateFlag,
    grantUserFeature,
    revokeUserFeature,
    refresh: async () => {
      await fetchFlags();
      await fetchUserFeatures();
    },
  };
};

export default useFeatureFlags;
