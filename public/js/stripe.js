/* eslint-disable */
import { showAlert } from './alert';
import axios from "axios";

const stripe = Stripe('pk_test_51GuFdsJ6KVh1TT4rdoGhSZfrNLg28W3Mibag1qOMnhx3ryCVOYNCnf8iGP5he9geGPiZu9bZBig3UV3VlzjF2nUm00KvrkjiBX');

export const bookTour = async tourId => {
   
    try {
        // get the checkout session from the server - use the route we defined
        const session = await axios(`http://localhost:3000/api/v1/bookings/checkout-session/${tourId}`)
        console.log(session);

        // create checkout form + charge credit card
        await stripe.redirectToCheckout({
            sessionId: session.data.stripeSession.id
        })

    } catch(err) {
        console.log(err);
        showAlert('error', err);
    }
   
    

}