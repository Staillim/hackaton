import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'SmartBurger - Ordena Inteligente. Come Mejor.',
  description: 'Sistema autónomo de ventas para restaurante con IA integrada. Personaliza tu pedido y recibe recomendaciones inteligentes.',
  keywords: 'hamburguesas, comida rápida, pedidos online, IA, restaurante inteligente',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #dc2626',
              },
              success: {
                iconTheme: {
                  primary: '#dc2626',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
