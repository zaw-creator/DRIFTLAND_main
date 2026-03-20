'use client';

import { usePathname } from 'next/navigation';
import Navbar02 from '@/components/Navbar/Navbar02';

export default function NavbarWrapper() {
  const pathname = usePathname();
  
  // Hide navbar on admin pages
  const isAdminPage = pathname.startsWith('/admin');
  
  if (isAdminPage) {
    return null;
  }
  
  return <Navbar02 foldSelector="[data-nav-fold]" />;
}
