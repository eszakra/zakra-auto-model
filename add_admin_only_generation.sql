-- sql script to add the feature flag

INSERT INTO public.feature_flags (key, value, description, category) 
VALUES (
    'admin_only_generation', 
    'false', 
    'When enabled, only admins can analyze, generate images, or upload new models. Regular users will be blocked.', 
    'admin'
)
ON CONFLICT (key) DO NOTHING;
