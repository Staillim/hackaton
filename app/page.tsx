import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import ProductsSection from '@/components/landing/ProductsSection';
import ReviewsSection from '@/components/landing/ReviewsSection';
import ChatWidget from '@/components/chat/ChatWidget';
import CartWidget from '@/components/cart/CartWidget';

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      <Hero />
      <ProductsSection />
      <ReviewsSection />
      
      {/* Floating widgets */}
      <ChatWidget />
      <CartWidget />
    </main>
  );
}
