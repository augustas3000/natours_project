// we have es lint configured for only node js code, so the browser
// code will be redded to disable this use the following line:
/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';

// this is another file to be sent to the client.
// it will include functionality for loggin such as
// make an axios request on the click of the login button:
// good shit.

// es6 syntax for exporting (on the front end)
export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      // for prod , del local host, end up with relative url, and sine
      // the api and the website are hosted on the same server, this
      // will work just fine 
      url: '/api/v1/users/login',
      data: {
        email,
        password
      }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully!');

      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
      const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout'
    });

    // refresh the page:
    if(res.data.status === 'success') {
        // will reload from the server not from the browser cache
        location.assign('/');
    }

  } catch (error) {
      showAlert('error', 'Error logging out! Try again.')
  }
  
  

};
