import React from 'react';

import HomePage from '/imports/ui/pages/HomePage';

// The root route: the start page. The menu's first item is no longer
// mirrored here; every section has its own address.
export default function HomeHandler(props) {
  return <HomePage {...props} />;
}
