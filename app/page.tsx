import Image from "next/image";

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
          <button className="btn-primary w-full sm:w-auto">
            Registrarse
          </button>
          <button className="btn-secondary w-full sm:w-auto">
            Iniciar sesión
          </button>
        </div>

        {/* Footer Text */}
        <p className="mt-8 text-base text-white/80">
          Comienza a gestionar tus finanzas de manera inteligente
        </p>
      </div>

      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}