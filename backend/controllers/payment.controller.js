import { stripe } from "../lib/stripe.js";
import { database } from "../lib/db.js";

export const createCheckoutSession = async (req, res) => {
  const { products, couponCode } = req.body;
	const userId = req.user?.id;

  if (!userId) return res.status(400).json({ message: "User not found" });

  try {
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Invalid products" });
    }

		//Product ids from the request
    const productIds = products.map(p => p.product_id);

    const { data: dbProducts, error: dbProductsError } = await database
      .from("products")
      .select("id, sale_price, name, image_url")
      .in("id", productIds);

    if (dbProductsError) throw dbProductsError;

		// Map db products by id for easy lookup
    const productMap = Object.fromEntries(
      dbProducts.map(p => [p.id, p])
    );

    // Validate products and quantities
    for (const item of products){
      if(!productMap[item.product_id]){
        return res.status(400).json({ message: `Product not found: ${item.product_id}` });
      }

      if(item.quantity <= 0){
        return res.status(400).json({ message: `Invalid quantity for product: ${item.product_id}` });
      }
    };

    let discount = 0;
    let coupon = null;
    let totalAmount = 0;

    if(couponCode){
      const {data} = await database
        .from('coupons')
        .select("discount_value, discount_type")
        .eq("code", couponCode)
        .eq("active", true)
        .maybeSingle();
      
      if(!data) return res.status(400).json({ message: "Invalid coupon" }); 

      coupon = data;
    };
		// Prepare line items for Stripe
    const lineItems = products.map(item => {
      const product = productMap[item.product_id];
      const unitAmount = Math.round(product.sale_price * 100);

      totalAmount += unitAmount * item.quantity;

      // Only include image if it's a valid URL under 2048 characters
      const imageUrl = product.image_url;
      const isValidImageUrl = imageUrl && 
        imageUrl.length <= 2048 && 
        (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            ...(isValidImageUrl && { images: [imageUrl] })
          },
          unit_amount: unitAmount
        },
        quantity: item.quantity
      };
    });

    // Apply coupon discount if available
    if(coupon){
      if(coupon.discount_type === "percentage"){
        discount = Math.round(totalAmount * (coupon.discount_value / 100));
      } else {
        discount = Math.round(coupon.discount_value * 100);
      }
      totalAmount -= Math.max(discount, 0);
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
      const {data, error} = await database
        .from("orders")
        .insert({
          user_id: userId,
          total_amount: totalAmount / 100,
          status: "pending"
        })
        .select()
        .single();
  
			if (error) throw error;	
			order = data;	

    } else {
			// update total amount if order exists
			await database
        .from("order_items")
        .delete()
        .eq("order_id", order.id);
      
      await database
        .from("orders")
        .update({ total_amount: totalAmount / 100 })
        .eq("id", order.id);
    };
    
    // insert order items
    const orderItems = products.map(item => {
			const product = productMap[item.product_id];

			return {
				order_id: order.id,
				product_id: product.id,
				quantity: item.quantity ?? 1,
				price: Math.round(product.sale_price * 100) // store price in cents
			};
		});

    // insert order items into DB
    await database.from("order_items").insert(orderItems);

    //  create stripe session (idempotent)
    // Use timestamp to make idempotency key unique for each checkout attempt
    const idempotencyKey = `checkout_${order.id}_${Date.now()}`;
    
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
      metadata: { 
        userId, 
        orderId: order.id, 
        couponCode: couponCode || "" 
      }
    }, {
      idempotencyKey
    });

    // update payment record
		const {error: paymentUpdateError } = await database
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

    return res.json({ id: session.id, url: session.url, totalAmount: totalAmount / 100 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Checkout failed" });
  }
};

//Stripe webhook handler for successful checkout
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
          amount: session.amount_total,
          status: "completed",
          transaction_id: sessionId,
          paid_at: new Date().toISOString()
        },
        { onConflict: ["order_id"] }
      )
      .select()
      .single();
    if (paymentUpdateError) throw paymentUpdateError;

    //Update product stock levels
    const { data: orderItems, error: orderItemsError } = await database
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);
    if (orderItemsError) throw orderItemsError;

    for (const item of orderItems) {
      // Fetch the current stock
      const { data: product, error: productError } = await database
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();
      if (productError) throw productError;

      if (product.stock <= item.quantity) {
        throw new Error(`Not enough stock for product ${item.product_id}`);
      }

      // Update stock
      const { error: stockUpdateError } = await database
        .from("products")
        .update({
          stock: product.stock - item.quantity
        })
        .eq("id", item.product_id);

      if (stockUpdateError) throw stockUpdateError;
    };

    //Clear old cart rows
    await database
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    res.json({ message: "Checkout successful", order: updatedOrder, payment: paymentUpdate.status });
  } catch (error) {
    console.error("Error processing successful checkout:", error);
    res.status(500).json({ message: "Error processing successful checkout", error: error.message });
  }
};




