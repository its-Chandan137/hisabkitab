# HisabKitab

HisabKitab is a frontend-only React + Vite udhar tracker with encrypted local storage, optional Supabase cloud sync, a dark glassmorphism UI, seeded sample data, group expense splitting, and mobile-first navigation.

## Stack

- React + Vite
- React Router v6
- TailwindCSS
- Framer Motion
- crypto-js AES encryption
- Supabase JavaScript client
- lucide-react icons
- date-fns formatting

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```bash
VITE_APP_USERNAME=yourname
VITE_APP_PASSWORD=yourpassword
VITE_ENCRYPTION_KEY=yoursecretkey32chars
VITE_SUPABASE_URL=https://yourprojectid.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

3. Start the dev server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Notes

- All app data is stored in `localStorage` under the `hisabkitab_data` key.
- The stored payload is AES encrypted with `VITE_ENCRYPTION_KEY`.
- The same encrypted blob can sync to Supabase in the `user_data` table.
- Login state is stored in `sessionStorage`.
- The first launch seeds sample friends, transactions, and the `HISAB` group.
- Offline changes stay available locally and sync automatically when the app comes back online.

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Create the `user_data` table:

```sql
create table if not exists user_data (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  data text not null,
  updated_at timestamp with time zone not null default now()
);
```

3. Run the RLS policy SQL:

```sql
alter table user_data enable row level security;

create policy "Allow all operations" on user_data
for all
using (true)
with check (true);
```

4. Copy the Project URL and anon key into your `.env` file.
5. Data now syncs automatically across devices using the encrypted payload already stored locally.

## Credentials

Use the username and password from your `.env` file on the login screen.
