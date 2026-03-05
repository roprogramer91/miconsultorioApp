const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');
// El client ID de Android y Web pueden ser diferentes dependiendo de la config de Google Cloud.
// En react-native-google-signin, usualmente se usa el WEB_CLIENT_ID para autenticar o el ANDROID_CLIENT_ID.
const client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID); 

const loginWithGoogle = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'Falta idToken' });
  }

  try {
    // 1. Verificar el token de Google
    // Le pasamos el array de Client IDs válidos si tenemos varios (Android, iOS, Web)
    const ticket = await client.verifyIdToken({
      idToken,
      audience: [
        process.env.GOOGLE_WEB_CLIENT_ID, 
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_EXPO_CLIENT_ID 
      ].filter(Boolean),
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name, picture } = payload;

    // 2. Buscar o crear el usuario en la BD
    let usuario = await prisma.usuario.findUnique({ where: { email } });

    if (!usuario) {
      usuario = await prisma.usuario.create({
        data: {
          email,
          nombres: given_name || '',
          apellidos: family_name || '',
          picture: picture || null,
        },
      });
      console.log('Nuevo usuario registrado:', email);
    } else {
      console.log('Usuario existente logueado:', email);
      // Podríamos actualizar la foto si cambió, pero omitiremos por simplicidad
    }

    // 3. Generar nuestro propio JWT interno
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET || 'miconsultorio_super_secret_dev',
      { expiresIn: '30d' } // Sesiones de 30 días
    );

    // 4. Retornar los datos
    res.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        picture: usuario.picture
      },
    });

  } catch (error) {
    console.error('Error verificando token de Google:', error);
    res.status(401).json({ error: 'Token de Google inválido o falló la verificación' });
  }
};

module.exports = {
  loginWithGoogle,
};
