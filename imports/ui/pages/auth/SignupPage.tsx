import React from 'react';

import LoginPage from './LoginPage';

// /register: the same email flow as /login — the account is made on the
// first code — with its own title, lead and link back to logging in.
export default function SignupPage() {
  return <LoginPage mode="signup" />;
}
