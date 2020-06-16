/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alert';

// this one will be called whe user seds a patch request to
// update-mydetails route, with email and name comming fro mthe form
export const updateSettings = async (data, type) => {
  // type is eitehr 'password' or 'data'
  try {
    const url = `/api/v1/users/${
      type === 'password' ? 'update-my-password' : 'update-my-details'
    }`;
    
    const res = await axios({
      method: 'PATCH',
      url,
      data
    });

    
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} successfully updated!`);
    }
  } catch (err) {
    console.log(err);
    showAlert('error', err.response.data.message);
  }
};
