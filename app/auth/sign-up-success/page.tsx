export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 text-center">
        <h1 className="text-3xl font-bold">Check your email</h1>
        <p className="text-muted-foreground">
          We've sent you a confirmation link. Please check your email to verify your account.
        </p>
        <p className="text-sm text-muted-foreground">
          Once verified, you can log in to your account.
        </p>
      </div>
    </div>
  )
}
