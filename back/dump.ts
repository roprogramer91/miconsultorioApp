import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.usuario.findMany({
    select: { id: true, nombres: true, apellidos: true, slug: true, estado: true }
  })
  console.log(JSON.stringify(users, null, 2))
}
main()
