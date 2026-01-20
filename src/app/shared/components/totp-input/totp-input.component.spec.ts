import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TotpInputComponent } from './totp-input.component';

describe('TotpInputComponent', () => {
  let component: TotpInputComponent;
  let fixture: ComponentFixture<TotpInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TotpInputComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TotpInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
