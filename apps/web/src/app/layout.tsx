import { Separator } from "@/components/ui/separator";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { MainNav } from "@/components/ui/main-nav";

import { aaveV2 } from "../app/data";

const navLinks = [
  {
    href: "/",
    match: "tx",
    title: "Playground",
  },
  {
    href: `/contract/${aaveV2}`,
    match: "contract",
    title: "Test contract",
  },
];

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Loop Decoder",
  description: "Demo of Loop Decoder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="hidden h-full flex-col md:flex">
          <div className="container flex flex-col items-start justify-between space-y-2 py-4 sm:flex-row sm:items-center sm:space-y-0 md:h-16">
            <h2 className="text-lg font-semibold">Loop Decoder</h2>
            <div className="flex flex-row space-x-4">
              <a
                target="_blank"
                href="https://github.com/3loop/loop-decoder"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100"
              >
                Github
              </a>
              <a
                target="_blank"
                href="https://twitter.com/3loop_io"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 dark:text-gray-200 dark:hover:text-gray-100"
              >
                Twitter
              </a>
            </div>
          </div>
          <Separator />

          <div className="container flex flex-row py-4">
            <MainNav className="mx-6" navLinks={navLinks} />
          </div>
          <div className="container h-full py-6">{children}</div>
        </div>
      </body>
    </html>
  );
}
