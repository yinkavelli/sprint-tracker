export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 text-center">
        <h1 className="text-3xl font-bold text-destructive">Authentication Error</h1>
        <p className="text-muted-foreground">
          Something went wrong with your authentication. Please try again.
        </p>
        <a
          href="/auth/login"
          className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Back to Login
        </a>
      </div>
    </div>
  )
}
