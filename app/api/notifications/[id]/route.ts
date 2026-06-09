import { prisma } from '@/lib/db'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const notification = await prisma.notification.update({
    where: { id: Number(params.id) },
    data: { read: Boolean(body?.read ?? true) },
  })
  return Response.json(notification)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.notification.delete({ where: { id: Number(params.id) } })
  return new Response(null, { status: 204 })
}
