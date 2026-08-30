import type { Session, User } from '@supabase/supabase-js';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** 인증 상태와 로그인/로그아웃 액션을 담는 콘텍스트 값. */
interface AuthContextValue {
	user: User | null;
	session: Session | null;
	loading: boolean;
	signInWithGoogle: () => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Supabase 세션을 구독해 인증 상태를 서브트리에 공급. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [session, setSession] = useState<Session | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		supabase.auth.getSession().then(({ data }) => {
			setSession(data.session);
			setUser(data.session?.user ?? null);
			setLoading(false);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			setUser(session?.user ?? null);
		});

		return () => subscription.unsubscribe();
	}, []);

	const signInWithGoogle = async () => {
		await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: { redirectTo: window.location.origin },
		});
	};

	const signOut = async () => {
		await supabase.auth.signOut();
	};

	return (
		<AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
			{children}
		</AuthContext.Provider>
	);
}

/**
 * 현재 인증 상태를 읽는 훅.
 * @throws AuthProvider 트리 밖에서 호출되었을 때.
 */
export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth must be used within an AuthProvider');
	return context;
}
