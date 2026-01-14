-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    api_id TEXT NOT NULL UNIQUE DEFAULT ('API_' || upper(substring(md5(random()::text), 1, 16))),
    api_key TEXT NOT NULL UNIQUE DEFAULT ('SK_' || upper(substring(md5(random()::text) || md5(random()::text), 1, 32))),
    balance BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create deposits table for user deposits
CREATE TABLE public.user_deposits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ref_id TEXT NOT NULL UNIQUE,
    amount BIGINT NOT NULL,
    final_amount BIGINT NOT NULL,
    qr_string TEXT,
    qr_image TEXT,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    paid_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.user_deposits ENABLE ROW LEVEL SECURITY;

-- RLS policies for deposits
CREATE POLICY "Users can view their own deposits" 
ON public.user_deposits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own deposits" 
ON public.user_deposits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own deposits" 
ON public.user_deposits FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Function to add balance to user
CREATE OR REPLACE FUNCTION public.add_user_balance(p_user_id UUID, p_amount BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles 
    SET balance = balance + p_amount 
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to regenerate API credentials
CREATE OR REPLACE FUNCTION public.regenerate_api_credentials(p_user_id UUID)
RETURNS TABLE(new_api_id TEXT, new_api_key TEXT) AS $$
DECLARE
    v_api_id TEXT;
    v_api_key TEXT;
BEGIN
    v_api_id := 'API_' || upper(substring(md5(random()::text), 1, 16));
    v_api_key := 'SK_' || upper(substring(md5(random()::text) || md5(random()::text), 1, 32));
    
    UPDATE public.profiles 
    SET api_id = v_api_id, api_key = v_api_key, updated_at = now()
    WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT v_api_id, v_api_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;