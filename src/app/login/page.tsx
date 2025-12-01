'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthErrorCodes, type User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { defaultSettings } from '@/hooks/display-settings-context';
import { EplanLogoIcon } from '@/components/icons/eplan-logo-icon';


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();

  const handleAuthAction = async (action: 'signIn' | 'signUp') => {
    if (!auth || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: 'Сервіс автентифікації недоступний.',
      });
      return;
    }
    if (!email || !password) {
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: 'Будь ласка, введіть email та пароль.',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (action === 'signIn') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Вхід успішний!' });
        router.push('/');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user profile in Firestore
        const userProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.email?.split('@')[0] || 'New User',
            role: 'engineer', // Default role
            displaySettings: defaultSettings,
        };
        await setDoc(doc(firestore, "users", user.uid), userProfile);
        
        toast({ title: 'Реєстрація успішна!'});
        router.push('/');
      }
    } catch (error: any) {
      let description = 'Виникла невідома помилка.';
      switch (error.code) {
        case 'auth/invalid-email':
          description = 'Неправильний формат email.';
          break;
        case AuthErrorCodes.USER_DELETED:
        case 'auth/user-not-found':
          description = 'Користувача з таким email не знайдено.';
          break;
        case AuthErrorCodes.INVALID_PASSWORD:
        case 'auth/wrong-password':
          description = 'Неправильний пароль. Спробуйте ще раз.';
          break;
        case AuthErrorCodes.EMAIL_EXISTS:
        case 'auth/email-already-in-use':
          description = 'Користувач з таким email вже існує. Спробуйте увійти.';
          break;
        case 'auth/too-many-requests':
          description = 'Забагато спроб. Спробуйте пізніше.';
          break;
        case 'auth/weak-password':
          description = 'Пароль занадто слабкий. Він має містити щонайменше 6 символів.'
          break;
        default:
          console.error('Unhandled auth error:', error);
      }
      toast({
        variant: 'destructive',
        title: action === 'signIn' ? 'Помилка входу' : 'Помилка реєстрації',
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
                <EplanLogoIcon className="h-8 w-8" />
                <h1 className="text-3xl font-bold tracking-tighter text-foreground bg-gradient-to-r from-blue-500 to-cyan-400 text-transparent bg-clip-text">
                  e-plan
                </h1>
            </div>
          <CardTitle>Вхід в систему</CardTitle>
          <CardDescription>Введіть ваші дані для доступу до панелі.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={() => handleAuthAction('signIn')} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Увійти
          </Button>
          <Button variant="outline" className="w-full" onClick={() => handleAuthAction('signUp')} disabled={isLoading}>
            Зареєструватися
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
