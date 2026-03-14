import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-8 pb-12">
      {/* Main Content */}
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo Section */}
        <div className="logo-container">
          <Image
            src="/finwise-logo.svg"
            alt="FinWise Logo"
            width={96}
            height={96}
            className="mx-auto"
            priority
          />
        </div>

        {/* App Name */}
        <h1 className="mt-8 text-4xl sm:text-5xl font-bold text-white tracking-tight">
          FinWise
        </h1>

        {/* Slogan */}
        <p className="mt-2 text-lg sm:text-xl text-white/90 font-medium">
          Tus finanzas en un solo lugar
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          <Link href="/signup" className="btn-primary">
            Registrarse
          </Link>
          <Link href="/login" className="btn-secondary">
            Iniciar sesión
          </Link>
        </div>

        {/* Footer Text */}
        <p className="mt-8 text-base md:text-lg lg:text-xl text-white/90 font-medium">
          Comienza a gestionar tus finanzas de manera inteligente
        </p>
      </div>

      {/* Background Elements */}
      <div className="background-elements">
        <div className="background-element bg-element-1"></div>
        <div className="background-element bg-element-2"></div>
        <div className="background-element bg-element-3"></div>
      </div>
    </div>
  );
}
