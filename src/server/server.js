/* eslint-disable func-names */
/* eslint-disable global-require */
import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import webpack from 'webpack';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { renderRoutes } from 'react-router-config';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import reducer from '../frontend/reducers';
import Layout from '../frontend/components/Layout';
import serverRoutes from '../frontend/routes/serverRoutes';
import getManifest from './getManifest';
import cookieParser from 'cookie-parser';
import boom from '@hapi/boom';
import passport from 'passport';
import axios from 'axios';

dotenv.config();

const app = express();
const { ENV, PORT } = process.env;

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

// Time to Cookie remember
const THIRTY_DAYS_IN_SEC = 2592000000;
const TWO_HOURS_IN_SEC = 7200000;


// Basic Strategy
require('./utils/auth/strategies/basic.js');


if (ENV === 'development') {
  const webPackConfig = require('../../webpack.config');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  const compiler = webpack(webPackConfig);
  const serverConfig = { port: PORT, hot: true };
  app.use(webpackDevMiddleware(compiler, serverConfig));
  app.use(webpackHotMiddleware(compiler));
} else {
  app.use((req, res, next) => {
    req.hashManifest = getManifest();
    next();
  });
  app.use(helmet());
  app.use(helmet.permittedCrossDomainPolicies());
  app.disable('x-powered-by');
}

const setResponse = (html, preloadedState, manifest) => {
  const mainStyles = manifest ? manifest['main.css'] : '/assets/app.css';
  const mainBuild = manifest ? manifest['main.js'] : '/assets/app.js';
  const vendorBuild = manifest ? manifest['vendors.js'] : 'assets/vendor.js';
  return (
    `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="ie=edge">
          <meta charset="utf-8" />
          <link rel="stylesheet" href="${mainStyles}" type="text/css"/>
          <title>Platfix</title>
        </head>
        <body>
          <div id="app">${html}</div>
          <script id="preloadedState">
            window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedState).replace(/</g, '\\u003c')}
          </script>
          <script src="${mainBuild}" type="text/javascript"></script>
          <script src="${vendorBuild}" type="text/javascript"></script>
        </body>
      </html>`
  );
};

const renderApp = async (req, res) => {
  let initialState;
  const { token, email, name, id } = req.cookies;

  try {
    let movieList = await axios({
      url: `${process.env.API_URL}/api/movies`,
      headers: { Authorization: `Bearer ${token}` },
      method: 'get',
    });
    movieList = movieList.data.data;

    initialState = {
      user: {
        id, email, name
      },
      myList: [],
      trends: movieList.filter(movie => movie.contentRating === 'PG' && movie._id),
      originals: movieList.filter(movie => movie.contentRating === 'G' && movie._id)
    }
  } catch (error) {
    initialState = {
      user: {},
      myList: [],
      trends: [],
      originals: []
    }
  }

  const store = createStore(reducer, initialState);
  const preloadedState = store.getState();
  const isLogged = (initialState.user.id);
  const html = renderToString(
    <Provider store={store}>
      <StaticRouter location={req.url} context={{}}>
        <Layout>
          {renderRoutes(serverRoutes(isLogged))}
        </Layout>
      </StaticRouter>
    </Provider>
  )
  res.send(setResponse(html, preloadedState, req.hashManifest));
};

app.post("/auth/sign-in", async function(req, res, next) {
  const { rememberMe } = req.body;

  passport.authenticate("basic", function(err, data) {
    try {
      if (err || !data) {
        next(boom.unauthorized());
      }

      req.login(data, { session: false }, async function(erro) {
        if (erro) {
          next(erro);
        }

        const { token, ...user } = data;

        res.cookie("token", token, {
          httpOnly: !(ENV === 'development'),
          secure: !(ENV === 'development'),
          maxAge: rememberMe ? THIRTY_DAYS_IN_SEC : TWO_HOURS_IN_SEC
        });

        res.status(200).json(user);
      })
    } catch (erro) {
      next(erro);
    }
  })(req, res, next);
});

app.post("/auth/sign-up", async function(req, res, next) {
  const { body: user } = req;

  try {
    const userData = await axios({
      url: `${process.env.API_URL}/api/auth/sign-up`,
      method: 'post',
      data: {
        'email': user.email,
        'name': user.name,
        'password': user.password
      }
    });

    res.status(201).json({
      name: req.body.name,
      email: req.body.email,
      id: userData.data.id
    });
  } catch (err) {
    next(err);
  }
});

app.get("/movies", async function(req, res, next) {

});

app.get('*', renderApp);

app.listen(PORT, (err) => {
  if (err) console.log(err);
  else console.log(`${ENV} server running on Port ${PORT}`);
});