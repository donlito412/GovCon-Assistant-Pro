import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'GovCon Assistant Pro',
  description: 'Pittsburgh-Area Government Business Intelligence Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900`}>
        <div className="min-h-screen flex flex-col">
          <header className="bg-white shadow-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-blue-600">GovCon Assistant Pro</h1>
                <nav className="flex space-x-4">
                  <a href="#" className="text-gray-600 hover:text-blue-600">Dashboard</a>
                  <a href="#" className="text-gray-600 hover:text-blue-600">Contracts</a>
                  <a href="#" className="text-gray-600 hover:text-blue-600">Pipeline</a>
                </nav>
            </div>
          </header>
          
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          
          <footer className="bg-white border-t py-6 mt-auto">
             <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
                &copy; {new Date().getFullYear()} GovCon Assistant Pro. Internal tool.
             </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
