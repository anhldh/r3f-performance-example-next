import { Layout, Navbar, Footer } from "nextra-theme-docs";
import { Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";
// import './globals.css'

export const metadata = {
  title: "r3f-monitor Docs",
  description: "Performance monitor for React Three Fiber",
};

const navbar = (
  <Navbar
    logo={<b>R3f-monitor</b>}
    projectLink="https://github.com/anhldh/r3f-monitor"
  >
    <a
      href="https://www.npmjs.com/package/r3f-monitor"
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "flex", alignItems: "center", marginLeft: "12px" }}
      title="View on NPM"
    >
      <img
        src="https://img.shields.io/npm/v/r3f-monitor?style=flat-square&color=cb3837&logo=npm"
        alt="NPM Version"
      />
    </a>
  </Navbar>
);

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={navbar}
          docsRepositoryBase="https://github.com/anhldh/r3f-monitor/tree/main"
          pageMap={await getPageMap()}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
