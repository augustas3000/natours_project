/* eslint-disable */

export const hideAlert = () => {
  const el = document.querySelector('.alert');
  if (el) {
    el.parentElement.removeChild(el);
  }
};

//  type = success/error
export const showAlert = (type, msg, time = 5) => {
  //  make sure we hide any existing alerts, before showing an alert
  
  hideAlert();

  //   the loggin request will be followed by either success/error
  //   response, according to that we will create an html element
  //   classed as per the status, with a text message as text value
  //   then this new html element will be injected into body element
  //   at the very top

  const markup = document.createElement('div');
  markup.innerHTML = `<div class="alert alert--${type}">${msg}</div>`.trim();
  document.querySelector('body').insertAdjacentElement('afterbegin', markup);

  //   after showing, we hide alerts after 5 secs
  window.setTimeout(() => {
    hideAlert();
  }, time * 1000);
};
