const isValidEmail = (email: string): boolean => {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
};

const extractEmailAddress = (emailString: string): string => {
  // Match email in brackets: "Name <email@domain.com>" or just return the string if no brackets
  const bracketMatch = emailString.match(/<([^>]+)>/);
  return bracketMatch ? bracketMatch[1] : emailString;
};

export { isValidEmail, extractEmailAddress };
