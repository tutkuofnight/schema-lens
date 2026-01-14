export const prismaSchema = `model User {
  id        Int       @id @default(autoincrement())
  email     String    @unique
  name      String
  avatarUrl String?
  createdAt DateTime  @default(now())
  posts     Post[]
  comments  Comment[]
}

model Category {
  id    Int     @id @default(autoincrement())
  name  String  @unique
  slug  String
  posts Post[]
}

model Post {
  id          Int       @id @default(autoincrement())
  title       String
  content     String?
  isPublished Boolean   @default(false)
  createdAt   DateTime  @default(now())
  author      User      @relation(fields: [authorId], references: [id])
  authorId    Int
  category    Category? @relation(fields: [categoryId], references: [id])
  categoryId  Int?
  comments    Comment[]
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String
  createdAt DateTime @default(now())
  post      Post     @relation(fields: [postId], references: [id])
  postId    Int
  user      User     @relation(fields: [userId], references: [id])
  userId    Int
}`