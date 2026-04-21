import React from 'react';
import { Text } from 'react-native';
import { toRenderableString } from './safeRender';

/**
 * SafeText — drop-in replacement for <Text>.
 * Coerces every non-element child via toRenderableString so an accidental
 * object child can never crash render with "Objects are not valid as a
 * React child".
 */
export default function SafeText({ children, ...rest }) {
  const coerced = React.Children.toArray(children).map((c) => {
    if (React.isValidElement(c)) return c;
    return toRenderableString(c);
  });
  return <Text {...rest}>{coerced}</Text>;
}
