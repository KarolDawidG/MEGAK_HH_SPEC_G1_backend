import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ConversationEntity } from './conversation.entity';
import { ConversationStatusEnum } from '../interfaces/ConversationInterface';
import { StudentService } from '../student/student.service';
import { studentStatus } from '../interfaces/StudentInterface';
import { MailService } from '../mail/mail.service';
import { messages } from '../config/messages';
import { newConversationEmailTemplate } from '../templates/email/newConversation';
import { cancelConversationEmailTemplate } from '../templates/email/cancelConversation';
import { Cron } from '@nestjs/schedule';
import { config } from '../config/config';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(ConversationEntity)
    private conversationRepository: Repository<ConversationEntity>,
    @Inject(StudentService)
    private studentService: StudentService,
    @Inject(MailService)
    private mailService: MailService,
  ) {}
  async hrCount(hrProfileId: string): Promise<number> {
    try {
      return await this.conversationRepository.count({
        where: { hrProfileId },
      });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async find(
    hrProfileId: string,
    studentId: string,
  ): Promise<ConversationEntity> {
    try {
      return await this.conversationRepository.findOne({
        where: { hrProfileId, studentId },
      });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async statusUpdate(
    id: string,
    status: ConversationStatusEnum,
  ): Promise<void> {
    try {
      await this.conversationRepository.update(
        { id },
        { status, updatedAt: () => 'CURRENT_TIMESTAMP' },
      );
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async startConversation(
    hrProfileId: string,
    studentId: string,
    studentEmail: string,
    companyName: string,
  ): Promise<ConversationEntity> {
    try {
      await this.studentService.statusUpdate(
        studentId,
        studentStatus.duringConversation,
      );
      await this.mailService.sendMail(
        studentEmail,
        messages.newConversationSubject,
        newConversationEmailTemplate(companyName),
      );
      return await this.conversationRepository.save({
        hrProfileId,
        studentId,
        status: ConversationStatusEnum.scheduled,
      });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async cancelConversation(
    conversationId: string,
    studentEmail: string,
    companyName: string,
    studentId: string,
  ): Promise<void> {
    try {
      await this.statusUpdate(conversationId, ConversationStatusEnum.canceled);
      await this.studentService.statusUpdate(
        studentId,
        studentStatus.available,
      );
      await this.mailService.sendMail(
        studentEmail,
        messages.cancelConversationSubject,
        cancelConversationEmailTemplate(companyName),
      );
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async cancelScheduledConversation(studentId: string) {
    try {
      await this.conversationRepository.update(
        { studentId, status: ConversationStatusEnum.scheduled },
        {
          status: ConversationStatusEnum.canceled,
          updatedAt: () => 'CURRENT_TIMESTAMP',
        },
      );
    } catch {
      throw new InternalServerErrorException();
    }
  }

  @Cron('0 */6 * * *')
  async conversationScan(): Promise<void> {
    try {
      const currentDate = new Date();
      const expirationDate = new Date(
        currentDate.getTime() - config.conversationExpirationTime * 1000,
      );
      const expiredConversation = await this.conversationRepository.find({
        where: [
          { createdAt: LessThan(expirationDate.toISOString()) },
          { status: ConversationStatusEnum.scheduled },
        ],
      });
      if (expiredConversation.length !== 0) {
        expiredConversation.map(async (conversation) => {
          await this.studentService.statusUpdate(
            conversation.studentId,
            studentStatus.available,
          );
          await this.conversationRepository.delete({ id: conversation.id });
        });
      }
    } catch (e) {
      console.log(e);
    }
  }
}