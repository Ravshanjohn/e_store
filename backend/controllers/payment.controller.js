import { stripe } from "../lib/stripe.js";
import { database } from "../lib/db.js";

export const createCheckoutSession = async (req, res) => {
  const { products, couponCode } = req.body;
	const userId = req.user?.id;

  if (!userId) return res.status(400).json({ message: "User not found" });

  try {
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Invalid or empty products array" });
    }

		//Product ids from the request
    const productIds = products.map(p => p.product_id);

    const { data: dbProducts, error: dbProductsError } = await database
      .from("products")
      .select("id, sale_price, name, image_url")
      .in("id", productIds);

    if (dbProductsError) throw dbProductsError;

		// Map db products by id for easy lookup
    const dbProductMap = {};
    dbProducts.forEach(p => dbProductMap[p.id] = p);

    let totalAmount = 0;

		// Prepare line items for Stripe
    const lineItems = products.map(item => {
      const dbProduct = dbProductMap[item.product_id];
      const unit = Math.round(dbProduct.sale_price * 100);

      totalAmount += unit * (item.quantity || 1);

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: dbProduct.name,
            images: [dbProduct.image_url],
          },
          unit_amount: unit
        },
        quantity: item.quantity || 1
      };
    });

		// Apply coupon if provided
    if (couponCode) {
      const { data: coupon } = await database
        .from("coupons")
        .select("discount_value, discount_type")
        .eq("code", couponCode)
        .eq("active", true)
        .maybeSingle();

      if (!coupon) return res.status(400).json({ message: "Coupon not found" });

      if (coupon.discount_type === "percentage") {
        totalAmount -= Math.round(totalAmount * coupon.discount_value / 100);
      } else {
        totalAmount -= Math.round(coupon.discount_value * 100);
      }
    }

    // find or create pending order
    let { data: order } = await database
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
		// create new order if not found
    if (!order) {
      const {data: result, error: insertError} = await database
        .from("orders")
        .insert({
          user_id: userId,
          total_amount: totalAmount / 100,
          status: "pending"
        })
        .select()
        .single();
			if (insertError) throw insertError;	
			order = result;				
    } else {
			// update total amount if order exists
			const {data: result, error: updateError } = await database
			.from("orders")
			.update({ total_amount: totalAmount / 100 })
			.eq("id", order.id)
			.eq("user_id", userId)
			.eq("status", "pending")
			.select()
			.single();
			if (updateError) throw updateError;	
			order = result;
    };
		
    // reuse existing stripe session if exists
    if (order.checkout_session_id) {
      return res.json({
        id: order.checkout_session_id,
        url: order.checkout_session_url,
        totalAmount
      });
    }

    //  delete old cart rows
    await database
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    // insert new ones
    const orderItems = products.map(item => {
			const product = dbProducts.find(p => p.id === item.product_id);

			if (!product) {
				throw new Error(`Product not found: ${item.product_id}`);
			}

			return {
				order_id: order.id,
				product_id: product.id,
				quantity: item.quantity ?? 1,
				price: product.sale_price
			};
		});


    await database.from("order_items").insert(orderItems);

    //  create stripe session (idempotent)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
      metadata: { userId, orderId: order.id, couponCode: couponCode || "" }
    }, {
      idempotencyKey: `checkout_${order.id}`
    });

    // update payment record
		const {data: paymetnUpdate, error: paymentUpdateError } = await database
			.from("payments")
			.upsert({ 
				order_id: order.id, 
				user_id: userId, 
				payment_method: 'stripe', 
				amount: totalAmount / 100, 
				status: "pending", 
				transaction_id: session.id 
			},
			{ onConflict: ["order_id"] })
			.select()
			.single();
		if(paymentUpdateError) throw paymentUpdateError;
		if(!paymetnUpdate ) {
			throw new Error('Failed to create or update payment record');
		};

    res.json({ id: session.id, url: session.url, totalAmount: totalAmount / 100 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Checkout failed" });
  }
};

export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "Session ID is required" });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return res.status(400).json({ message: "Payment not completed" });

    const userId = session.metadata.userId;
    const orderId = session.metadata.orderId;

    // Update order status
    const { data: updatedOrder, error: orderError } = await database
      .from("orders")
      .update({ status: "processing" })
      .eq("id", orderId)
      .eq("user_id", userId)
      .select()
      .single();
    if (orderError) throw orderError;

    // Update payment record
    const { data: paymentUpdate, error: paymentUpdateError } = await database
      .from("payments")
      .upsert(
        {
          order_id: orderId,
          user_id: userId,
          payment_method: "stripe",
          amount: session.amount_total / 100,
          status: "completed",
          transaction_id: sessionId,
          paid_at: new Date().toISOString()
        },
        { onConflict: ["order_id"] }
      )
      .select()
      .single();
    if (paymentUpdateError) throw paymentUpdateError;

    res.json({ message: "Checkout successful", order: updatedOrder, payment: paymentUpdate.status });
  } catch (error) {
    console.error("Error processing successful checkout:", error);
    res.status(500).json({ message: "Error processing successful checkout", error: error.message });
  }
};




