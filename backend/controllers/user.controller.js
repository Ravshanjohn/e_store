import { database } from "../lib/db.js";

export const getProfile = async (req, res) => {
  try {
    const {id} = req.params;
    if(!id) return res.status(400).json({ message: "User id is required" });

    const {data, error} = await database.from('users_address').select('line_1, line_2, city, zip, country').eq("user_id", id).maybeSingle();
    if(error) throw error;

    return res.status(200).json({data})
  } catch (error) {
    console.error(error);
		return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.params; // user_id
    const { line_1, line_2, city, country, zip } = req.body;

    // Validate fields
    const requiredFields = { line_1, city, country, zip };
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value) {
        return res.status(400).json({ message: `${key} is required` });
      }
    }

    // Upsert user address
    const { data: existing } = await database
      .from("users_address")
      .select("id, created_at")
      .eq("user_id", id)
      .single();

    const now = new Date().toISOString();

    const { data, error } = await database
      .from("users_address")
      .upsert(
        {
          user_id: id,
          line_1,
          line_2,
          city,
          country,
          zip,
          created_at: existing ? existing.created_at : now,
          updated_at: now
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error) throw error;

    return res.status(200).json({message: "Profile updated successfully", data});
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
