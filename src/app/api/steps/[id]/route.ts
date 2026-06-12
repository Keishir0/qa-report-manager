import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Impedir alterações de IDs e datas de auditoria
    const {
      id: _id,
      reportId: _reportId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      ...updateData
    } = body;

    // Converter stepNumber para number se enviado
    if (updateData.stepNumber !== undefined && updateData.stepNumber !== null) {
      updateData.stepNumber = Number(updateData.stepNumber);
    }

    const exists = await prisma.testStep.findUnique({
      where: { id },
    });

    if (!exists) {
      return NextResponse.json(
        { error: "Passo de teste não encontrado" },
        { status: 404 }
      );
    }

    const updatedStep = await prisma.testStep.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedStep);
  } catch (error: any) {
    console.error(`Error in PUT /api/steps/${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const exists = await prisma.testStep.findUnique({
      where: { id },
    });

    if (!exists) {
      return NextResponse.json(
        { error: "Passo de teste não encontrado" },
        { status: 404 }
      );
    }

    await prisma.testStep.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error in DELETE /api/steps/${params.id}:`, error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
