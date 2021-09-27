import { loginRequest, setFavorite } from '../../actions/index.js';
import movieMock from '../../__mocks__/movieMock.js';

describe('Actions', () => {

  test('Set favorite', () => {
    const payload = movieMock;
    const expectedAction = {
      type: 'SET_FAVORITE',
      payload
    };

    expect(setFavorite(payload)).toEqual(expectedAction);
  });

  test('Login', () => {
    const payload = {
      email: 'test@test.com',
      password: 'password'
    };
    const expectedAction = {
      type: 'LOGIN_REQUEST',
      payload
    };

    expect(loginRequest(payload)).toEqual(expectedAction);
  })
});