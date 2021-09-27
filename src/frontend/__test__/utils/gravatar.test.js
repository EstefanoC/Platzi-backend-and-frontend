import gravatar from '../../utils/gravatar.js';

test('Gravatar Function test', () => {
  const email = 'estefano_jesus66_@hotmail.com';
  const gravatarUrl = 'https://gravatar.com/avatar/960cd1e49f27b1d7ec114df10f4db9a4';

  expect(gravatarUrl).toEqual(gravatar(email));
})