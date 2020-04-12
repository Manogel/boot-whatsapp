const axios = require('axios');

const api = axios.create({
  baseURL: 'https://eu95.chat-api.com/instance116041',
});

module.exports = api;
