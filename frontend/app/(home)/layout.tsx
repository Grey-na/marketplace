import Footer from "@/components/partials/Footer";
import Header from "@/components/partials/Header";


export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}