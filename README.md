# Titan

Next.js 15 fullstack template with better-auth for authentication.

> [!WARNING]
> This project uses Next.js 15-canary to support node runtime on middleware. This is not yet supported in stable version.

## Tech Stack

- Full-stack framework: Next.js 15-canary
- UI: Tailwind CSS v4
- Component library: Shadcn UI
- Authentication: better-auth
- Database: postgres
- ORM: drizzle-orm

## Features

- Authentication
  - Email/password
  - Social login (Google, Github)
  - Magic link
  - Forgot password
  - Change password
  - Email verification
- Database
  - Postgres
  - ORM: drizzle-orm
- Next.js API, server actions, and middleware

## Getting Started

1. Clone the repository

```bash
git clone https://github.com/rudrodip/titan.git
```

2. Install dependencies

```bash
bun install
```

3. Create environment file

```bash
cp .env.example .env
```

4. Run the development server

```bash
bun dev
```

5. Open the browser and navigate to `http://localhost:3000`

Todos:

- [ ] Landing page
- [ ] Dashboard page
- [ ] Auth pages
  - [ ] Sign in
  - [ ] Sign up
  - [ ] Forgot password
  - [ ] Reset password
- [ ] Email / Password login
- [ ] Email verification
- [ ] Forgot password
- [ ] Reset password
- [ ] Social login
  - [ ] Google
  - [x] Github
  - [ ] Discord
- [ ] Custom sign-in, sign-up, and password reset pages
- [ ] Resend integration
- [ ] Email templates
- [ ] 