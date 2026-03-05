const prisma = require('../prisma/client');

const registerToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const pushToken = await prisma.pushToken.upsert({
      where: { token },
      update: {},
      create: { token },
    });

    res
      .status(200)
      .json({ message: "Token registered successfully", pushToken });
  } catch (error) {
    console.error("Error registering push token:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  registerToken,
};
